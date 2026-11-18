"""Basic matrix operations implemented without external libraries."""
from typing import List

Matrix = List[List[float]]


def validate_matrix(matrix: Matrix) -> None:
    """Raise a ValueError if the matrix is empty or has uneven rows."""
    if not matrix or not matrix[0]:
        raise ValueError("Matrix must not be empty.")
    row_length = len(matrix[0])
    if any(len(row) != row_length for row in matrix):
        raise ValueError("All rows must have the same number of columns.")


def transpose(matrix: Matrix) -> Matrix:
    """Return the transpose of the matrix."""
    validate_matrix(matrix)
    num_rows, num_cols = len(matrix), len(matrix[0])
    return [[matrix[row][col] for row in range(num_rows)] for col in range(num_cols)]


def multiply(matrix_a: Matrix, matrix_b: Matrix) -> Matrix:
    """Return the product of two matrices."""
    validate_matrix(matrix_a)
    validate_matrix(matrix_b)
    if len(matrix_a[0]) != len(matrix_b):
        raise ValueError("Number of columns in A must equal number of rows in B.")

    result = [[0 for _ in range(len(matrix_b[0]))] for _ in range(len(matrix_a))]
    for i in range(len(matrix_a)):
        for j in range(len(matrix_b[0])):
            for k in range(len(matrix_b)):
                result[i][j] += matrix_a[i][k] * matrix_b[k][j]
    return result


def is_symmetric(matrix: Matrix) -> bool:
    """Check whether the matrix is equal to its transpose."""
    validate_matrix(matrix)
    if len(matrix) != len(matrix[0]):
        return False
    return matrix == transpose(matrix)


def print_matrix(matrix: Matrix) -> None:
    """Print the matrix in a readable format."""
    for row in matrix:
        print(" ".join(f"{value:>4}" for value in row))


def main() -> None:
    matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

    print("Transpose:")
    print_matrix(transpose(matrix))

    print("\nProduct:")
    print_matrix(multiply(matrix, matrix))

    print(f"\nIs symmetric: {is_symmetric(matrix)}")


if __name__ == "__main__":
    main()
