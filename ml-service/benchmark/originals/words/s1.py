def clean(text):
    result = ""
    for ch in text:
        if ch.isalpha() or ch == " ":
            result += ch.lower()
        else:
            result += " "
    return result


def count_words(text):
    counts = {}
    for word in clean(text).split():
        if word in counts:
            counts[word] += 1
        else:
            counts[word] = 1
    return counts


def top_words(counts, k):
    items = list(counts.items())
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[j][1] > items[i][1]:
                items[i], items[j] = items[j], items[i]
    return items[:k]


def main():
    text = input("Text: ")
    counts = count_words(text)
    for word, c in top_words(counts, 3):
        print(word, c)


main()
