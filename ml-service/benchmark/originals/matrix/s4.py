def get(mat, r, c):
    return mat[r][c]


def flip(mat):
    answer = {}
    r = 0
    while r < len(mat):
        c = 0
        while c < len(mat[r]):
            answer[(c, r)] = get(mat, r, c)
            c += 1
        r += 1
    return to_list(answer, len(mat[0]), len(mat))


def to_list(cells, height, width):
    grid = []
    for r in range(height):
        grid.append([cells[(r, c)] for c in range(width)])
    return grid


def product(p, q):
    cells = {}
    for r in range(len(p)):
        for c in range(len(q[0])):
            cells[(r, c)] = 0
            idx = 0
            while idx < len(q):
                cells[(r, c)] = cells[(r, c)] + get(p, r, idx) * get(q, idx, c)
                idx += 1
    return to_list(cells, len(p), len(q[0]))


def same_when_flipped(mat):
    flipped = flip(mat)
    for r in range(len(mat)):
        if mat[r] != flipped[r]:
            return False
    return True


data = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
for line in flip(data):
    print(*line)
for line in product(data, data):
    print(*line)
print(same_when_flipped(data))
