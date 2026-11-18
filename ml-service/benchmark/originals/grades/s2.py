import statistics
from collections import Counter

BOUNDS = [(90, "A"), (75, "B"), (60, "C"), (40, "D")]


def to_letter(score):
    for limit, letter in BOUNDS:
        if score >= limit:
            return letter
    return "F"


def summarise(scores):
    letters = Counter(to_letter(s) for s in scores)
    return {
        "mean": statistics.mean(scores),
        "median": statistics.median(scores),
        "grades": dict(letters),
    }


if __name__ == "__main__":
    raw = input("Enter marks: ")
    scores = list(map(int, raw.split()))
    report = summarise(scores)
    for key, value in report.items():
        print(f"{key.title()}: {value}")
