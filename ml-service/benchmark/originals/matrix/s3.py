class Matrix:
    def __init__(self, data):
        self.data = data
        self.n = len(data)
        self.m = len(data[0])

    def t(self):
        out = [[0] * self.n for _ in range(self.m)]
        for i in range(self.n):
            for j in range(self.m):
                out[j][i] = self.data[i][j]
        return Matrix(out)

    def __mul__(self, other):
        out = [[0] * other.m for _ in range(self.n)]
        for i in range(self.n):
            for k in range(self.m):
                if self.data[i][k] == 0:
                    continue
                for j in range(other.m):
                    out[i][j] += self.data[i][k] * other.data[k][j]
        return Matrix(out)

    def symmetric(self):
        if self.n != self.m:
            return False
        return self.data == self.t().data

    def __str__(self):
        lines = []
        for r in self.data:
            lines.append(" ".join(str(v) for v in r))
        return "\n".join(lines)


a = Matrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
print(a.t())
print(a * a)
print(a.symmetric())
