"""Word frequency counter.

Counts how often each word appears in a piece of text and prints the most
common ones.
"""
import string
from collections import defaultdict
from typing import Dict, List, Tuple


def clean_text(text: str) -> str:
    """Lowercase the text and remove punctuation."""
    translator = str.maketrans("", "", string.punctuation)
    return text.lower().translate(translator)


def count_word_frequencies(text: str) -> Dict[str, int]:
    """Return a dictionary mapping each word to its frequency."""
    frequencies: Dict[str, int] = defaultdict(int)
    for word in clean_text(text).split():
        if word.isalpha():
            frequencies[word] += 1
    return dict(frequencies)


def get_top_words(frequencies: Dict[str, int], top_n: int = 3) -> List[Tuple[str, int]]:
    """Return the top_n most frequent words, ties broken alphabetically."""
    sorted_words = sorted(frequencies.items(), key=lambda item: (-item[1], item[0]))
    return sorted_words[:top_n]


def main() -> None:
    text = input("Text: ").strip()
    if not text:
        print("No text provided.")
        return

    frequencies = count_word_frequencies(text)
    print("Most common words:")
    for rank, (word, count) in enumerate(get_top_words(frequencies), start=1):
        print(f"{rank}. {word}: {count}")


if __name__ == "__main__":
    main()
