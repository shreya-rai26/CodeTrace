"""Groups flagged pairs into 'copy rings' (connected components)."""


def find_clusters(ids, flagged_pairs):
    parent = {i: i for i in ids}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in flagged_pairs:
        parent[find(a)] = find(b)

    groups = {}
    for i in ids:
        groups.setdefault(find(i), []).append(i)
    return sorted((sorted(g) for g in groups.values() if len(g) > 1),
                  key=len, reverse=True)
