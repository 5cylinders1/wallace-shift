import { useEffect, useState, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'

export function MailIcon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    compose: <><path d="m16 3 5 5-12 12H4v-5Z" /><path d="m14 5 5 5" /></>,
    sent: <><path d="m21 3-7 18-4-7-7-4Z" /><path d="m10 14 11-11" /></>,
    signature: <><path d="M3 18c4-1 4-11 8-13 4-2 1 6-2 9-3 3-1 5 1 3l3-3c-1 5 3 2 5 1" /><path d="M3 21h18" /></>,
    logout: <><path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" /></>,
    attachment: <path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9a2 2 0 0 1 3 3l-8 8a1 1 0 0 1-2-2l7-7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="M19 12H5m5-5-5 5 5 5" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    bold: <><path d="M7 4h6a4 4 0 0 1 0 8H7m0 0h7a4 4 0 0 1 0 8H7V4" /></>,
    italic: <><path d="M10 4h9M5 20h9M15 4 9 20" /></>,
    underline: <><path d="M6 4v8a6 6 0 0 0 12 0V4M4 21h16" /></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M3 6h.1M3 12h.1M3 18h.1" strokeWidth="3" /></>,
    ordered: <><path d="M10 6h11M10 12h11M10 18h11M3 3h1v5M2 8h4M2 13c2-2 5 0 1 3l-1 2h4" /></>,
    link: <><path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M14 8l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.92)" /></>,
    undo: <><path d="M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -3)" /><path d="m8 3-4 4 4 4" /></>,
    redo: <><path d="M20 7H10a6 6 0 0 0 0 12M16 3l4 4-4 4" /></>,
    refresh: <><path d="M20 10a8 8 0 1 0 0 6M20 4v6h-6" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.compose}</svg>
}

export function RichTextEditor({ value, onChange, disabled = false }: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['http', 'https', 'mailto', 'tel'] } })],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'mail-editor-content', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Message body', 'data-placeholder': 'Write your message…' },
      transformPastedHTML: html => DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe'] }),
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  })
  const state = useEditorState({ editor, selector: ({ editor: instance }) => ({ bold: instance?.isActive('bold'), italic: instance?.isActive('italic'), underline: instance?.isActive('underline'), bulletList: instance?.isActive('bulletList'), orderedList: instance?.isActive('orderedList'), link: instance?.isActive('link'), heading: instance?.isActive('heading', { level: 2 }), undo: instance?.can().undo(), redo: instance?.can().redo() }) })
  useEffect(() => { if (editor && editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false }) }, [editor, value])
  useEffect(() => { editor?.setEditable(!disabled) }, [editor, disabled])
  function applyLink() {
    if (!editor) return
    if (!link.trim()) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setLinkOpen(false); return }
    const href = /^[a-z][a-z\d+.-]*:/i.test(link.trim()) ? link.trim() : `https://${link.trim()}`
    try { if (!['https:', 'http:', 'mailto:', 'tel:'].includes(new URL(href).protocol)) throw new Error() }
    catch { setLinkError('Enter a website, email, or phone link.'); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run(); setLinkOpen(false)
  }
  return <div className={`mail-editor${disabled ? ' mail-editor-disabled' : ''}`}>
    <div className="mail-toolbar" role="toolbar" aria-label="Text formatting">
      <button type="button" className="mail-format-heading" title="Heading" aria-label="Heading" aria-pressed={Boolean(state?.heading)} disabled={disabled || !editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <span className="mail-toolbar-divider" />
      <button type="button" title="Bold" aria-label="Bold" aria-pressed={Boolean(state?.bold)} disabled={disabled || !editor} onClick={() => editor?.chain().focus().toggleBold().run()}><MailIcon name="bold" size={18} /></button>
      <button type="button" title="Italic" aria-label="Italic" aria-pressed={Boolean(state?.italic)} disabled={disabled || !editor} onClick={() => editor?.chain().focus().toggleItalic().run()}><MailIcon name="italic" size={18} /></button>
      <button type="button" title="Underline" aria-label="Underline" aria-pressed={Boolean(state?.underline)} disabled={disabled || !editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}><MailIcon name="underline" size={18} /></button>
      <span className="mail-toolbar-divider" />
      <button type="button" title="Bulleted list" aria-label="Bulleted list" aria-pressed={Boolean(state?.bulletList)} disabled={disabled || !editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}><MailIcon name="list" size={18} /></button>
      <button type="button" title="Numbered list" aria-label="Numbered list" aria-pressed={Boolean(state?.orderedList)} disabled={disabled || !editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><MailIcon name="ordered" size={18} /></button>
      <button type="button" title="Insert link" aria-label="Insert link" aria-expanded={linkOpen} aria-pressed={Boolean(state?.link)} disabled={disabled || !editor} onClick={() => { setLink(editor?.getAttributes('link').href ?? ''); setLinkError(''); setLinkOpen(!linkOpen) }}><MailIcon name="link" size={18} /></button>
      <span className="mail-toolbar-divider" />
      <button type="button" title="Undo" aria-label="Undo" disabled={disabled || !state?.undo} onClick={() => editor?.chain().focus().undo().run()}><MailIcon name="undo" size={18} /></button>
      <button type="button" title="Redo" aria-label="Redo" disabled={disabled || !state?.redo} onClick={() => editor?.chain().focus().redo().run()}><MailIcon name="redo" size={18} /></button>
    </div>
    {linkOpen && <div className="mail-link-editor"><label htmlFor="mail-link-url">Link address</label><input id="mail-link-url" type="text" value={link} placeholder="https://example.com" autoFocus onChange={event => setLink(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } if (event.key === 'Escape') setLinkOpen(false) }} /><button type="button" className="mail-button mail-button-small" onClick={applyLink}>Apply</button><button type="button" className="mail-icon-button" aria-label="Close link editor" onClick={() => setLinkOpen(false)}><MailIcon name="close" size={18} /></button>{linkError && <span role="alert">{linkError}</span>}</div>}
    <EditorContent editor={editor} />
  </div>
}
