import sys


def read_marks():
    line = sys.stdin.readline()
    numbers = []
    for part in line.strip().split(" "):
        if part != "":
            numbers.append(float(part))
    return numbers


def get_median(values):
    values = values[:]
    values.sort()
    while len(values) > 2:
        values = values[1:-1]
    return sum(values) / len(values)


def letter_for(x):
    letters = ["F", "D", "C", "B", "A"]
    limits = [0, 40, 60, 75, 90]
    answer = "F"
    for i in range(5):
        if x >= limits[i]:
            answer = letters[i]
    return answer


values = read_marks()
print("Mean: %.2f" % (sum(values) / len(values)))
print("Median: %.2f" % get_median(values))
tally = {}
for v in values:
    l = letter_for(v)
    if l not in tally:
        tally[l] = 0
    tally[l] = tally[l] + 1
for l in sorted(tally):
    print(l, tally[l])
