"""Language-agnostic code normaliser.

Turns source code into a stream of (token, line_number) pairs where
identifiers, strings and numbers are replaced by placeholders and comments
are dropped. Renaming variables or rewriting comments therefore produces
the same stream, which is what makes the fingerprinting robust.
"""
from pygments import lex
from pygments.lexers import get_lexer_for_filename, TextLexer
from pygments.token import Token
from pygments.util import ClassNotFound


def _lexer_for(filename: str):
    try:
        return get_lexer_for_filename(filename, stripnl=False)
    except ClassNotFound:
        return TextLexer(stripnl=False)


def tokenize(code: str, filename: str = "file.py", normalize: bool = True):
    """Return a list of (token_text, line_number). Lines are 1-based."""
    out = []
    line = 1
    for ttype, value in lex(code, _lexer_for(filename)):
        start_line = line
        line += value.count("\n")
        if not value.strip():
            continue
        if ttype in Token.Comment or ttype in Token.Literal.String.Doc:
            continue
        if not normalize:
            out.append((value, start_line))
        elif ttype in Token.Name.Builtin or ttype in Token.Keyword or ttype in Token.Operator.Word:
            out.append((value, start_line))
        elif ttype in Token.Name:
            out.append(("ID", start_line))
        elif ttype in Token.Literal.String:
            # a multi-part string literal should count once
            if not out or out[-1][0] != "STR":
                out.append(("STR", start_line))
        elif ttype in Token.Literal.Number:
            out.append(("NUM", start_line))
        else:
            out.append((value, start_line))
    return out
