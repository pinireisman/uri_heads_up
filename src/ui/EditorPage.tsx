import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "../i18n";
import type { Category, Word } from "../domain/types";
import { categoryRepo } from "./data";

function blankCategory(): Category {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    icon: "",
    color: "#4f7cac",
    enabled: true,
    words: [],
  };
}

const EMOJIS =
  "🐘 🦒 🐶 🐱 🦁 🐼 🦉 🐬 🎬 🎵 🎤 🎮 ⚽ 🏀 🍕 🍦 🎂 🌍 ✈️ 🚗 🏰 📚 🔬 🎨 🦸 🧙 👨‍👩‍👧‍👦 😀 🎉 ⭐ 🔥 🌈".split(
    " ",
  );

const toWord = (text: string): Word => ({
  id: crypto.randomUUID(),
  text,
  enabled: true,
});

export default function EditorPage({ id }: { id?: string }) {
  const t = useT();
  const { locale } = useLocale();
  const [category, setCategory] = useState<Category | null>(
    id ? null : blankCategory(),
  );
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; lastY: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    void categoryRepo().then(async (repo) => {
      const stored = await repo.get(id);
      if (stored) setCategory(stored);
      else window.location.hash = "#/";
    });
  }, [id]);

  // drag-to-reorder: live-swap with the neighbor whenever the pointer crosses
  // a row boundary; window-level listeners for the drag's duration, and
  // touch-action:none on the handle makes it work on phones. Must stay above
  // the early return so the hook order is stable while the category loads.
  useEffect(() => {
    const drag = dragRef.current;
    if (!draggingId || !drag) return;
    const onMove = (e: PointerEvent) => {
      const row = document.querySelector<HTMLLIElement>(".word-row.dragging");
      const rowH = (row?.offsetHeight ?? 48) + 6; // + list gap
      const dy = e.clientY - drag.lastY;
      if (Math.abs(dy) < rowH * 0.6) return;
      const dir: -1 | 1 = dy > 0 ? 1 : -1;
      setCategory((c) => {
        if (!c) return c;
        const index = c.words.findIndex((w) => w.id === draggingId);
        const j = index + dir;
        if (index < 0 || j < 0 || j >= c.words.length) return c;
        const words = [...c.words];
        [words[index], words[j]] = [words[j]!, words[index]!];
        drag.lastY += dir * rowH; // ponytail: dev StrictMode double-invoke may double this; prod unaffected
        return { ...c, words };
      });
    };
    const onUp = () => {
      dragRef.current = null;
      setDraggingId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingId]);

  if (!category) return null;
  const patch = (p: Partial<Category>) => setCategory({ ...category, ...p });
  const patchWord = (wordId: string, p: Partial<Word>) =>
    patch({
      words: category.words.map((w) => (w.id === wordId ? { ...w, ...p } : w)),
    });

  const addTexts = (texts: string[]) => {
    const words = texts
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toWord);
    if (words.length) patch({ words: [...category.words, ...words] });
  };

  const moveWord = (index: number, dir: -1 | 1) => {
    const words = [...category.words];
    const j = index + dir;
    if (j < 0 || j >= words.length) return;
    [words[index], words[j]] = [words[j]!, words[index]!];
    patch({ words });
  };

  const onHandleDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    e.preventDefault();
    dragRef.current = { id, lastY: e.clientY };
    setDraggingId(id);
  };

  const dedupe = () => {
    const seen = new Set<string>();
    patch({
      words: category.words.filter((w) => {
        const key = w.text.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    });
  };

  const save = async () => {
    if (!category.name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    await (
      await categoryRepo()
    ).put({ ...category, name: category.name.trim() });
    window.location.hash = `#/category/${encodeURIComponent(category.id)}`;
  };

  const remove = async () => {
    if (!window.confirm(t("confirmDeleteCategory"))) return;
    await (await categoryRepo()).delete(category.id);
    window.location.hash = "#/";
  };

  return (
    <main className="page">
      <a href={id ? `#/category/${encodeURIComponent(id)}` : "#/"}>
        ← {t("back")}
      </a>
      <h1>{id ? t("editCategoryTitle") : t("newCategoryTitle")}</h1>

      <div className="form-grid">
        <label>
          {t("nameLabel")}
          <input
            value={category.name}
            onChange={(e) => patch({ name: e.target.value })}
            maxLength={100}
          />
        </label>
        <label>
          {t("descriptionLabel")}
          <input
            value={category.description}
            onChange={(e) => patch({ description: e.target.value })}
            maxLength={500}
          />
        </label>
        <label>
          {t("iconLabel")}
          <input
            className="input-icon"
            value={category.icon}
            onChange={(e) => patch({ icon: e.target.value })}
            maxLength={16}
          />
        </label>
        <label>
          {t("colorLabel")}
          <input
            type="color"
            value={category.color || "#4f7cac"}
            onChange={(e) => patch({ color: e.target.value })}
          />
        </label>
      </div>

      <details>
        <summary>{t("emojiPick")}</summary>
        <div className="emoji-grid">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => patch({ icon: e })} aria-label={e}>
              {e}
            </button>
          ))}
        </div>
      </details>

      <label className="check">
        <input
          type="checkbox"
          checked={category.ordered ?? false}
          onChange={(e) => patch({ ordered: e.target.checked })}
        />
        {t("playInOrder")}
      </label>

      <h2>
        {t("wordsLabel")} ({category.words.length})
      </h2>
      <div className="row">
        <input
          value={single}
          placeholder={t("addWordPlaceholder")}
          maxLength={200}
          onChange={(e) => setSingle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTexts([single]);
              setSingle("");
            }
          }}
        />
        <button
          onClick={() => {
            addTexts([single]);
            setSingle("");
          }}
        >
          {t("add")}
        </button>
      </div>
      <div className="row">
        <textarea
          value={bulk}
          placeholder={t("bulkPlaceholder")}
          rows={3}
          onChange={(e) => setBulk(e.target.value)}
        />
        <button
          onClick={() => {
            addTexts(bulk.split("\n"));
            setBulk("");
          }}
        >
          {t("addAll")}
        </button>
      </div>
      <div className="row">
        <button onClick={dedupe}>{t("removeDuplicates")}</button>
        <button
          onClick={() =>
            patch({
              words: [...category.words].sort((a, b) =>
                a.text.localeCompare(b.text, locale),
              ),
            })
          }
        >
          {t("sortAlpha")}
        </button>
      </div>

      {/* ponytail: plain list, fine into the hundreds; virtualize if 10k-word decks get edited */}
      <ul className="word-list">
        {category.words.map((w, i) => (
          <li
            key={w.id}
            className={`word-row${draggingId === w.id ? " dragging" : ""}`}
          >
            <button
              className="drag-handle"
              aria-label={t("dragToReorder")}
              onPointerDown={(e) => onHandleDown(e, w.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                e.preventDefault();
                moveWord(i, e.key === "ArrowUp" ? -1 : 1);
              }}
            >
              ⠿
            </button>
            <input
              type="checkbox"
              aria-label={t("wordEnabledLabel")}
              checked={w.enabled}
              onChange={(e) => patchWord(w.id, { enabled: e.target.checked })}
            />
            <input
              aria-label={t("wordTextLabel")}
              value={w.text}
              maxLength={200}
              onChange={(e) => patchWord(w.id, { text: e.target.value })}
            />
            <button
              className="btn-plain"
              aria-label={t("deleteWordLabel")}
              onClick={() =>
                patch({ words: category.words.filter((x) => x.id !== w.id) })
              }
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <nav className="stack">
        <button className="btn btn-primary" onClick={() => void save()}>
          {t("save")}
        </button>
        {id && (
          <button className="btn btn-danger" onClick={() => void remove()}>
            {t("deleteCategory")}
          </button>
        )}
      </nav>
    </main>
  );
}
