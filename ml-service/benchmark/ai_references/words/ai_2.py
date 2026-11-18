import re


def tokenize(text):
    """Split the text into lowercase words."""
    return re.findall(r"\b[a-zA-Z']+\b", text.lower())


def build_frequency_table(words):
    """Build a frequency table from a list of words."""
    table = {}
    for word in words:
        # Increment the count for this word
        table[word] = table.get(word, 0) + 1
    return table


def find_most_frequent(table, limit=3):
    """Find the most frequent words without using sorted()."""
    remaining = dict(table)
    winners = []
    while remaining and len(winners) < limit:
        best_word = max(remaining, key=remaining.get)
        winners.append((best_word, remaining.pop(best_word)))
    return winners


def display_results(winners):
    """Print the results in a formatted table."""
    print(f"{'Word':<15}{'Count':>5}")
    print("-" * 20)
    for word, count in winners:
        print(f"{word:<15}{count:>5}")


if __name__ == "__main__":
    user_text = input("Text: ")
    word_list = tokenize(user_text)
    if word_list:
        display_results(find_most_frequent(build_frequency_table(word_list)))
    else:
        print("No words found in the input.")
