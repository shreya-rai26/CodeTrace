import string
import heapq


def normalise(sentence):
    table = str.maketrans(string.punctuation + string.digits,
                          " " * (len(string.punctuation) + len(string.digits)))
    return sentence.translate(table).lower().split()


def tally(tokens):
    seen = dict.fromkeys(tokens, 0)
    for token in tokens:
        seen[token] += 1
    return seen


def best(seen, how_many):
    return heapq.nlargest(how_many, seen.items(), key=lambda pair: pair[1])


sentence = input("Text: ")
ranking = best(tally(normalise(sentence)), 3)
print("\n".join("%s %d" % entry for entry in ranking))
