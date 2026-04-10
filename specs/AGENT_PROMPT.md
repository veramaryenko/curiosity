# Prompt dla agenta implementującego feature

Skopiuj poniższy prompt do Claude Code, zastępując `[PLIK]` nazwą pliku spec:

---

Zaimplementuj feature opisany w `specs/[PLIK].md`.

Zasady:
- Pracuj w izolowanym worktree (nie dotykaj main)
- Przed pisaniem kodu przeczytaj istniejące pliki których dotyczy feature
- Trzymaj się zakresu opisanego w sekcji "Nie robimy"
- Napisz testy jednostkowe jeśli dotyczysz logiki w `src/lib/` lub `src/app/api/`
- Nie dodawaj komentarzy ani docstringów do kodu którego nie zmieniasz
- Po zakończeniu podaj listę zmienionych plików i krótki opis co zrobiłeś

---
