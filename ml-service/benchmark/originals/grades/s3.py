class GradeBook:
    def __init__(self, marks):
        self.marks = list(marks)

    def average(self):
        return sum(self.marks) / len(self.marks)

    def middle(self):
        data = sorted(self.marks)
        half, odd = divmod(len(data), 2)
        return data[half] if odd else (data[half - 1] + data[half]) / 2

    @staticmethod
    def letter(value):
        index = 0
        cutoffs = [40, 60, 75, 90]
        while index < len(cutoffs) and value >= cutoffs[index]:
            index += 1
        return "FDCBA"[index]

    def distribution(self):
        result = {}
        for value in self.marks:
            key = self.letter(value)
            result[key] = result.get(key, 0) + 1
        return result


book = GradeBook(int(t) for t in input("Enter marks: ").split())
print("Mean:", book.average())
print("Median:", book.middle())
print("Grades:", book.distribution())
