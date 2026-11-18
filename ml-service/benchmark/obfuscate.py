"""Makes disguised copies of a Python file, the way a student hiding a copy would.

Level 1: rename every variable, function and class
Level 2: level 1 + shuffle the order of functions + new comments
Level 3: level 2 + insert dead code between statements
Level 4: level 3 + rewrite statements (x += y  ->  x = x + y, swap if/else)
"""
import ast
import builtins
import random

BUILTINS = set(dir(builtins))
WORDS = ["alpha", "beta", "temp", "val", "data", "item", "res", "node", "buf", "acc",
         "cur", "nxt", "obj", "arr", "num", "idx", "ptr", "box", "bag", "out"]


class Renamer(ast.NodeTransformer):
    def __init__(self, tree, rng):
        self.map = {}
        self.rng = rng
        names = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                names.add(node.id)
            elif isinstance(node, ast.arg) and node.arg != "self":
                names.add(node.arg)
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                names.add(node.name)
        for i, name in enumerate(sorted(names - BUILTINS)):
            if not name.startswith("__"):
                self.map[name] = f"{rng.choice(WORDS)}_{i}"

    def visit_Name(self, node):
        node.id = self.map.get(node.id, node.id)
        return node

    def visit_arg(self, node):
        node.arg = self.map.get(node.arg, node.arg)
        return node

    def visit_FunctionDef(self, node):
        self.generic_visit(node)
        node.name = self.map.get(node.name, node.name)
        return node

    def visit_ClassDef(self, node):
        self.generic_visit(node)
        node.name = self.map.get(node.name, node.name)
        return node

    def visit_keyword(self, node):
        self.generic_visit(node)
        if node.arg in self.map:
            node.arg = self.map[node.arg]
        return node


class DeadCode(ast.NodeTransformer):
    def __init__(self, rng):
        self.rng, self.n = rng, 0

    def _junk(self):
        self.n += 1
        src = self.rng.choice([
            "unused_{n} = {a} * {b}",
            "if {a} > {b} + 100:\n    pass",
            "flag_{n} = not False",
            "tmp_{n} = [{a}, {b}][0]",
        ]).format(n=self.n, a=self.rng.randint(1, 9), b=self.rng.randint(1, 9))
        return ast.parse(src).body[0]

    def visit_FunctionDef(self, node):
        self.generic_visit(node)
        body = []
        for stmt in node.body:
            body.append(stmt)
            if self.rng.random() < 0.5 and not isinstance(stmt, ast.Return):
                body.append(self._junk())
        node.body = body
        return node


class Rewriter(ast.NodeTransformer):
    def visit_AugAssign(self, node):
        if isinstance(node.target, ast.Name):
            return ast.Assign(
                targets=[ast.Name(node.target.id, ast.Store())],
                value=ast.BinOp(ast.Name(node.target.id, ast.Load()), node.op, node.value),
                lineno=node.lineno)
        return node

    def visit_If(self, node):
        self.generic_visit(node)
        if node.orelse and not isinstance(node.orelse[0], ast.If):
            node.test = ast.UnaryOp(ast.Not(), node.test)
            node.body, node.orelse = node.orelse, node.body
        return node


def obfuscate(source: str, level: int, seed: int = 0) -> str:
    rng = random.Random(seed)
    tree = ast.parse(source)
    if level >= 4:
        tree = Rewriter().visit(tree)
    if level >= 3:
        tree = DeadCode(rng).visit(tree)
    if level >= 1:
        tree = Renamer(tree, rng).visit(tree)
    if level >= 2:
        idx = [i for i, n in enumerate(tree.body) if isinstance(n, ast.FunctionDef)]
        funcs = [tree.body[i] for i in idx]
        rng.shuffle(funcs)
        for i, f in zip(idx, funcs):
            tree.body[i] = f
    ast.fix_missing_locations(tree)
    code = ast.unparse(tree)
    if level >= 2:
        lines = []
        for line in code.split("\n"):
            if line.startswith("def ") or line.startswith("class "):
                lines.append(f"# {rng.choice(['helper', 'my logic', 'step', 'utility'])} {rng.randint(1, 99)}")
            lines.append(line)
        code = "# written by me\n" + "\n".join(lines)
    return code + "\n"
