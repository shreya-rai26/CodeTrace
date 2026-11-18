def transpose(matrix):
    return [list(column) for column in zip(*matrix)]


def multiply(left, right):
    columns = transpose(right)
    return [[sum(x * y for x, y in zip(row, col)) for col in columns] for row in left]


def is_symmetric(matrix):
    size = len(matrix)
    return all(matrix[r][c] == matrix[c][r] for r in range(size) for c in range(r))


def render(matrix):
    return "\n".join(" ".join(map(str, row)) for row in matrix)


if __name__ == "__main__":
    grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    print(render(transpose(grid)))
    print(render(multiply(grid, grid)))
    print(is_symmetric(grid))
