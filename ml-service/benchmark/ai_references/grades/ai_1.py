"""Grade statistics calculator.

Reads a list of marks and reports the mean, median and grade distribution.
"""
from typing import Dict, List

GRADE_THRESHOLDS = {"A": 90, "B": 75, "C": 60, "D": 40}


def calculate_mean(marks: List[float]) -> float:
    """Return the arithmetic mean of the given marks."""
    if not marks:
        raise ValueError("The marks list cannot be empty.")
    return sum(marks) / len(marks)


def calculate_median(marks: List[float]) -> float:
    """Return the median of the given marks."""
    if not marks:
        raise ValueError("The marks list cannot be empty.")
    sorted_marks = sorted(marks)
    middle = len(sorted_marks) // 2
    if len(sorted_marks) % 2 == 1:
        return sorted_marks[middle]
    return (sorted_marks[middle - 1] + sorted_marks[middle]) / 2


def get_grade(mark: float) -> str:
    """Convert a numeric mark into a letter grade."""
    for grade, threshold in GRADE_THRESHOLDS.items():
        if mark >= threshold:
            return grade
    return "F"


def count_grades(marks: List[float]) -> Dict[str, int]:
    """Count how many marks fall into each letter grade."""
    grade_counts = {grade: 0 for grade in ["A", "B", "C", "D", "F"]}
    for mark in marks:
        grade_counts[get_grade(mark)] += 1
    return grade_counts


def main() -> None:
    """Entry point of the program."""
    try:
        marks = [float(value) for value in input("Enter marks: ").split()]
    except ValueError:
        print("Error: please enter numeric values only.")
        return

    if not marks:
        print("No marks were entered.")
        return

    print(f"Mean: {calculate_mean(marks):.2f}")
    print(f"Median: {calculate_median(marks):.2f}")
    print("Grade distribution:")
    for grade, count in count_grades(marks).items():
        print(f"  {grade}: {count}")


if __name__ == "__main__":
    main()
