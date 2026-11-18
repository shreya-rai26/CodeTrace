class MatrixOperations:
    """A small helper class that groups common matrix operations."""

    def __init__(self, rows):
        if not rows:
            raise ValueError("Matrix cannot be empty")
        self.rows = [list(row) for row in rows]
        self.row_count = len(self.rows)
        self.col_count = len(self.rows[0])

    def transpose(self):
        # Swap rows and columns using zip
        return MatrixOperations(zip(*self.rows))

    def multiply(self, other):
        if self.col_count != other.row_count:
            raise ValueError("Incompatible dimensions for multiplication")
        other_columns = list(zip(*other.rows))
        product = []
        for row in self.rows:
            new_row = []
            for column in other_columns:
                # Dot product of the row and the column
                new_row.append(sum(a * b for a, b in zip(row, column)))
            product.append(new_row)
        return MatrixOperations(product)

    def is_symmetric(self):
        if self.row_count != self.col_count:
            return False
        for i in range(self.row_count):
            for j in range(i + 1, self.col_count):
                if self.rows[i][j] != self.rows[j][i]:
                    return False
        return True

    def __repr__(self):
        return "\n".join("\t".join(str(value) for value in row) for row in self.rows)


if __name__ == "__main__":
    # Example usage
    matrix = MatrixOperations([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    print("Transpose:")
    print(matrix.transpose())
    print("Product:")
    print(matrix.multiply(matrix))
    print("Symmetric:", matrix.is_symmetric())
