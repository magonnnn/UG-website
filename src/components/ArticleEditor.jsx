import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

const escapeHtml = (text) =>
    text.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);

const toEditorHtml = (content) => {
    if (!content) return "<p></p>";
    if (/<\/?[a-z][\s\S]*>/i.test(content)) return content;

    return content
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("");
};

const ToolbarButton = ({ editor, label, active = false, disabled = false, onClick, onPointerDown, children }) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={active}
        disabled={!editor || disabled}
        onPointerDown={onPointerDown}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        className={`min-h-9 min-w-9 border px-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
            active
                ? "border-primary bg-primary/20 text-white"
                : "border-white/10 text-gray-300 hover:bg-white/[0.06] hover:text-white"
        }`}
    >
        {children}
    </button>
);

const ArticleEditor = ({ value, onChange, onUploadImage, onError, onUploadingChange }) => {
    const imageInput = useRef(null);
    const toolbarSelection = useRef(null);
    const lastEditorHtml = useRef(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ link: false }),
            Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
            Image.configure({ allowBase64: false }),
        ],
        content: toEditorHtml(value),
        onUpdate: ({ editor: currentEditor }) => {
            const html = currentEditor.getHTML();
            lastEditorHtml.current = html;
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: "article-editor-content",
                id: "article-content",
                "aria-label": "Treść artykułu",
            },
        },
    });

    useEffect(() => {
        if (!editor) return;

        const content = toEditorHtml(value);
        if (content !== lastEditorHtml.current && editor.getHTML() !== content) {
            editor.commands.setContent(content, { emitUpdate: false });
            lastEditorHtml.current = editor.getHTML();
        }
    }, [editor, value]);

    const rememberSelection = () => {
        if (editor) {
            toolbarSelection.current = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
            };
        }
    };

    const runAtSelection = (action) => {
        if (!editor) return;

        const selection = toolbarSelection.current ?? editor.state.selection;
        const chain = editor.chain()
            .focus()
            .setTextSelection({ from: selection.from, to: selection.to });
        action(chain).run();
        toolbarSelection.current = null;
    };

    const addLink = () => {
        if (!editor) return;

        const currentHref = editor.getAttributes("link").href ?? "";
        const href = window.prompt("Wklej adres linku", currentHref);
        if (href === null) return;

        if (!href.trim()) {
            runAtSelection((chain) => chain.unsetLink());
            return;
        }

        runAtSelection((chain) => chain.setLink({ href: href.trim() }));
    };

    const uploadImage = async (file) => {
        if (!file || !editor) return;

        setUploadingImage(true);
        onUploadingChange(true);
        try {
            const src = await onUploadImage(file);
            runAtSelection((chain) => chain.setImage({ src, alt: file.name }));
        } catch (error) {
            onError(error);
        } finally {
            setUploadingImage(false);
            onUploadingChange(false);
        }
    };

    return (
        <div className="min-w-0">
            <div className="flex flex-wrap gap-1 border border-white/10 p-2" role="toolbar" aria-label="Formatowanie tekstu">
                <ToolbarButton
                    editor={editor}
                    label="Pogrubienie"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("bold")}
                    onClick={() => runAtSelection((chain) => chain.toggleBold())}
                >
                    B
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Kursywa"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("italic")}
                    onClick={() => runAtSelection((chain) => chain.toggleItalic())}
                >
                    <span className="italic">I</span>
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Nagłówek 2"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("heading", { level: 2 })}
                    onClick={() => runAtSelection((chain) => chain.toggleHeading({ level: 2 }))}
                >
                    H2
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Nagłówek 3"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("heading", { level: 3 })}
                    onClick={() => runAtSelection((chain) => chain.toggleHeading({ level: 3 }))}
                >
                    H3
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Lista punktowana"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("bulletList")}
                    onClick={() => runAtSelection((chain) => chain.toggleBulletList())}
                >
                    • Lista
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Lista numerowana"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("orderedList")}
                    onClick={() => runAtSelection((chain) => chain.toggleOrderedList())}
                >
                    1. Lista
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Cytat"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("blockquote")}
                    onClick={() => runAtSelection((chain) => chain.toggleBlockquote())}
                >
                    Cytat
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Dodaj lub edytuj link"
                    onPointerDown={rememberSelection}
                    active={editor?.isActive("link")}
                    onClick={addLink}
                >
                    Link
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Cofnij"
                    onPointerDown={rememberSelection}
                    onClick={() => runAtSelection((chain) => chain.undo())}
                >
                    Undo
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label="Ponów"
                    onPointerDown={rememberSelection}
                    onClick={() => runAtSelection((chain) => chain.redo())}
                >
                    Redo
                </ToolbarButton>
                <ToolbarButton
                    editor={editor}
                    label={uploadingImage ? "Przesyłanie obrazu" : "Wstaw obraz"}
                    disabled={uploadingImage}
                    onPointerDown={rememberSelection}
                    onClick={() => imageInput.current?.click()}
                >
                    {uploadingImage ? "..." : "Obraz"}
                </ToolbarButton>
                <input
                    ref={imageInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                        void uploadImage(event.target.files?.[0]);
                        event.target.value = "";
                    }}
                />
            </div>
            <EditorContent editor={editor} />
            <p className="mt-2 text-xs text-gray-500">
                Kliknij w tekst i pisz. Zaznacz fragment, aby go sformatować.
            </p>
        </div>
    );
};

export default ArticleEditor;
