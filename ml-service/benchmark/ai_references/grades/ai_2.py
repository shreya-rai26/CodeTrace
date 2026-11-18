from dataclasses import dataclass, field
from typing import List


@dataclass
class GradeReport:
    """Holds a set of marks and computes summary statistics."""

    marks: List[float] = field(default_factory=list)

    def add_mark(self, mark: float) -> None:
        # Validate the mark before storing it
        if not 0 <= mark <= 100:
            raise ValueError(f"Invalid mark: {mark}. Marks must be between 0 and 100.")
        self.marks.append(mark)

    @property
    def mean(self) -> float:
        return sum(self.marks) / len(self.marks) if self.marks else 0.0

    @property
    def median(self) -> float:
        if not self.marks:
            return 0.0
        ordered = sorted(self.marks)
        mid, remainder = divmod(len(ordered), 2)
        return ordered[mid] if remainder else (ordered[mid - 1] + ordered[mid]) / 2

    @staticmethod
    def to_letter(mark: float) -> str:
        if mark >= 90:
            return "A"
        if mark >= 75:
            return "B"
        if mark >= 60:
            return "C"
        if mark >= 40:
            return "D"
        return "F"

    def distribution(self) -> dict:
        result = {}
        for mark in self.marks:
            letter = self.to_letter(mark)
            result[letter] = result.get(letter, 0) + 1
        return dict(sorted(result.items()))


def main():
    report = GradeReport()
    for token in input("Enter marks: ").split():
        try:
            report.add_mark(float(token))
        except ValueError as error:
            print(f"Skipping value: {error}")

    # Display the results
    print(f"Mean: {report.mean:.2f}")
    print(f"Median: {report.median:.2f}")
    print(f"Grades: {report.distribution()}")


if __name__ == "__main__":
    main()
