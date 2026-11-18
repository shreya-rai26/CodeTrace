def transpose(a):
    rows = len(a)
    cols = len(a[0])
    result = []
    for j in range(cols):
        row = []
        for i in range(rows):
            row.append(a[i][j])
        result.append(row)
    return result


def multiply(a, b):
    result = []
    for i in range(len(a)):
        row = []
        for j in range(len(b[0])):
            s = 0
            for k in range(len(b)):
                s += a[i][k] * b[k][j]
            row.append(s)
        result.append(row)
    return result


def is_symmetric(a):
    return a == transpose(a)


def show(a):
    for row in a:
        print(" ".join(str(x) for x in row))


m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
show(transpose(m))
show(multiply(m, m))
print(is_symmetric(m))
