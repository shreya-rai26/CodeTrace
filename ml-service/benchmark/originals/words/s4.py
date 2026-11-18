class WordStats:
    def __init__(self):
        self.table = {}

    def feed(self, text):
        current = []
        for symbol in text + " ":
            if "a" <= symbol.lower() <= "z":
                current.append(symbol.lower())
            elif current:
                self.add("".join(current))
                current = []

    def add(self, word):
        self.table.setdefault(word, 0)
        self.table[word] += 1

    def leaders(self, size):
        ordered = sorted(self.table, key=self.table.get, reverse=True)
        return [(w, self.table[w]) for w in ordered[:size]]


stats = WordStats()
stats.feed(input("Text: "))
for w, n in stats.leaders(3):
    print(w, n)
