import { marked } from 'marked';

/** Markdown from our own content files to HTML. Content is trusted: it's ours, not user input. */
export const md = (text: string) => marked.parse(text, { async: false });
