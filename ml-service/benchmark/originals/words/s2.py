import re
from collections import Counter

WORD = re.compile(r"[a-z]+")


def frequencies(text):
    return Counter(WORD.findall(text.lower()))


def most_common(text, limit=3):
    return frequencies(text).most_common(limit)


if __name__ == "__main__":
    for token, seen in most_common(input("Text: ")):
        print(token, seen)
