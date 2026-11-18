def mean(marks):
    total = 0
    for m in marks:
        total += m
    return total / len(marks)


def median(marks):
    ordered = sorted(marks)
    n = len(ordered)
    mid = n // 2
    if n % 2 == 0:
        return (ordered[mid - 1] + ordered[mid]) / 2
    return ordered[mid]


def grade(mark):
    if mark >= 90:
        return "A"
    elif mark >= 75:
        return "B"
    elif mark >= 60:
        return "C"
    elif mark >= 40:
        return "D"
    return "F"


def grade_counts(marks):
    counts = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for m in marks:
        counts[grade(m)] += 1
    return counts


def main():
    marks = [int(x) for x in input("Enter marks: ").split()]
    print("Mean:", mean(marks))
    print("Median:", median(marks))
    print("Grades:", grade_counts(marks))


main()
