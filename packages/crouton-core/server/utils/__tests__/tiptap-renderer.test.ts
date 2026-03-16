import { describe, it, expect } from 'vitest'
import { renderTipTapToHtml } from '../tiptap-renderer'

describe('renderTipTapToHtml', () => {
  describe('input parsing', () => {
    it('returns empty string for null/undefined', () => {
      expect(renderTipTapToHtml(null as any)).toBe('')
      expect(renderTipTapToHtml(undefined as any)).toBe('')
      expect(renderTipTapToHtml('')).toBe('')
    })

    it('returns empty string for non-TipTap JSON', () => {
      expect(renderTipTapToHtml('just a string')).toBe('')
      expect(renderTipTapToHtml('{"type":"notdoc"}')).toBe('')
      expect(renderTipTapToHtml({ type: 'notdoc' })).toBe('')
    })

    it('returns empty string for invalid JSON string', () => {
      expect(renderTipTapToHtml('{invalid json')).toBe('')
    })

    it('parses JSON string with doc type', () => {
      const json = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }]
      })
      expect(renderTipTapToHtml(json)).toBe('<p>hello</p>')
    })

    it('accepts pre-parsed object', () => {
      const doc = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }]
      }
      expect(renderTipTapToHtml(doc)).toBe('<p>hello</p>')
    })
  })

  describe('text nodes and marks', () => {
    function doc(...content: any[]) {
      return { type: 'doc', content }
    }
    function p(...content: any[]) {
      return { type: 'paragraph', content }
    }
    function text(t: string, marks?: any[]) {
      return { type: 'text', text: t, marks }
    }

    it('escapes HTML in text', () => {
      expect(renderTipTapToHtml(doc(p(text('<script>alert("xss")</script>'))))).toBe(
        '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>'
      )
    })

    it('renders bold mark', () => {
      expect(renderTipTapToHtml(doc(p(text('bold', [{ type: 'bold' }]))))).toBe(
        '<p><strong>bold</strong></p>'
      )
    })

    it('renders italic mark', () => {
      expect(renderTipTapToHtml(doc(p(text('em', [{ type: 'italic' }]))))).toBe(
        '<p><em>em</em></p>'
      )
    })

    it('renders underline mark', () => {
      expect(renderTipTapToHtml(doc(p(text('u', [{ type: 'underline' }]))))).toBe(
        '<p><u>u</u></p>'
      )
    })

    it('renders strike mark', () => {
      expect(renderTipTapToHtml(doc(p(text('s', [{ type: 'strike' }]))))).toBe(
        '<p><s>s</s></p>'
      )
    })

    it('renders code mark', () => {
      expect(renderTipTapToHtml(doc(p(text('code', [{ type: 'code' }]))))).toBe(
        '<p><code>code</code></p>'
      )
    })

    it('renders highlight mark', () => {
      expect(renderTipTapToHtml(doc(p(text('hi', [{ type: 'highlight' }]))))).toBe(
        '<p><mark>hi</mark></p>'
      )
    })

    it('renders link mark with href', () => {
      const result = renderTipTapToHtml(doc(p(text('click', [{ type: 'link', attrs: { href: 'https://example.com' } }]))))
      expect(result).toBe('<p><a href="https://example.com">click</a></p>')
    })

    it('renders link with target="_blank" and rel', () => {
      const result = renderTipTapToHtml(doc(p(text('link', [{ type: 'link', attrs: { href: 'https://x.com', target: '_blank' } }]))))
      expect(result).toBe('<p><a href="https://x.com" target="_blank" rel="noopener noreferrer">link</a></p>')
    })

    it('strips javascript: URLs from links', () => {
      const result = renderTipTapToHtml(doc(p(text('bad', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]))))
      expect(result).toBe('<p>bad</p>')
    })

    it('renders nested marks (bold + italic)', () => {
      const result = renderTipTapToHtml(doc(p(text('both', [{ type: 'bold' }, { type: 'italic' }]))))
      expect(result).toBe('<p><em><strong>both</strong></em></p>')
    })

    it('ignores unknown marks', () => {
      const result = renderTipTapToHtml(doc(p(text('text', [{ type: 'superscript' }]))))
      expect(result).toBe('<p>text</p>')
    })
  })

  describe('block nodes', () => {
    it('renders empty paragraph as &nbsp;', () => {
      expect(renderTipTapToHtml({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('<p>&nbsp;</p>')
    })

    it('renders headings h1-h6', () => {
      for (let level = 1; level <= 6; level++) {
        const result = renderTipTapToHtml({
          type: 'doc',
          content: [{ type: 'heading', attrs: { level }, content: [{ type: 'text', text: `h${level}` }] }]
        })
        expect(result).toBe(`<h${level}>h${level}</h${level}>`)
      }
    })

    it('defaults heading level to 2', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'heading', content: [{ type: 'text', text: 'title' }] }]
      })
      expect(result).toBe('<h2>title</h2>')
    })

    it('clamps heading level to 1-6', () => {
      expect(renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 0 }, content: [{ type: 'text', text: 'x' }] }]
      })).toBe('<h1>x</h1>')

      expect(renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 9 }, content: [{ type: 'text', text: 'x' }] }]
      })).toBe('<h6>x</h6>')
    })

    it('renders bulletList', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }] }
          ]
        }]
      })
      expect(result).toBe('<ul><li><p>a</p></li><li><p>b</p></li></ul>')
    })

    it('renders orderedList', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'orderedList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] }
          ]
        }]
      })
      expect(result).toBe('<ol><li><p>first</p></li></ol>')
    })

    it('renders blockquote', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quote' }] }]
        }]
      })
      expect(result).toBe('<blockquote><p>quote</p></blockquote>')
    })

    it('renders codeBlock', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'codeBlock',
          content: [{ type: 'text', text: 'const x = 1' }]
        }]
      })
      expect(result).toBe('<pre><code>const x = 1</code></pre>')
    })

    it('renders horizontalRule', () => {
      expect(renderTipTapToHtml({ type: 'doc', content: [{ type: 'horizontalRule' }] })).toBe('<hr>')
    })

    it('renders hardBreak', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [
            { type: 'text', text: 'line1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'line2' }
          ]
        }]
      })
      expect(result).toBe('<p>line1<br>line2</p>')
    })
  })

  describe('custom blocks', () => {
    it('renders imageBlock with figure/figcaption', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'imageBlock',
          attrs: { src: 'https://img.com/photo.jpg', alt: 'A photo', caption: 'My photo' }
        }]
      })
      expect(result).toBe('<figure><img src="https://img.com/photo.jpg" alt="A photo" /><figcaption>My photo</figcaption></figure>')
    })

    it('renders image type same as imageBlock', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'image',
          attrs: { src: 'https://img.com/photo.jpg', alt: 'Alt' }
        }]
      })
      expect(result).toBe('<figure><img src="https://img.com/photo.jpg" alt="Alt" /></figure>')
    })

    it('renders imageBlock without caption', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'imageBlock',
          attrs: { src: 'https://img.com/photo.jpg' }
        }]
      })
      expect(result).toBe('<figure><img src="https://img.com/photo.jpg" alt="" /></figure>')
    })

    it('escapes attributes in imageBlock', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'imageBlock',
          attrs: { src: 'x" onload="alert(1)', alt: '<script>' }
        }]
      })
      expect(result).toContain('src="x&quot; onload=&quot;alert(1)')
      expect(result).toContain('alt="&lt;script&gt;"')
    })

    it('renders embedBlock in container', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'embedBlock',
          attrs: { src: 'https://youtube.com/embed/abc', height: 400 }
        }]
      })
      expect(result).toBe('<div class="embed-container not-prose" style="margin:1.75rem 0"><iframe src="https://youtube.com/embed/abc" style="width:100%;height:400px;border:0;border-radius:0.375rem" allowfullscreen></iframe></div>')
    })

    it('uses default height 300 for embedBlock', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'embedBlock', attrs: { src: 'https://example.com' } }]
      })
      expect(result).toContain('height:300px')
    })

    it('blocks javascript: in embedBlock src', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'embedBlock', attrs: { src: 'javascript:alert(1)' } }]
      })
      expect(result).toBe('')
    })
  })

  describe('unknown nodes', () => {
    it('renders children of unknown node', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{
          type: 'customWidget',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'inner' }] }]
        }]
      })
      expect(result).toBe('<p>inner</p>')
    })

    it('returns empty for unknown node without children', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'unknownEmpty' }]
      })
      expect(result).toBe('')
    })
  })

  describe('complex documents', () => {
    it('renders a full document with mixed content', () => {
      const doc = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
          { type: 'paragraph', content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world', marks: [{ type: 'bold' }] },
            { type: 'text', text: '!' }
          ] },
          { type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }] }
          ] },
          { type: 'horizontalRule' },
          { type: 'blockquote', content: [
            { type: 'paragraph', content: [
              { type: 'text', text: 'quoted', marks: [{ type: 'italic' }] }
            ] }
          ] }
        ]
      }
      const html = renderTipTapToHtml(doc)
      expect(html).toBe(
        '<h1>Title</h1>' +
        '<p>Hello <strong>world</strong>!</p>' +
        '<ul><li><p>item</p></li></ul>' +
        '<hr>' +
        '<blockquote><p><em>quoted</em></p></blockquote>'
      )
    })
  })

  describe('XSS prevention', () => {
    it('escapes script tags in text', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>' }] }]
      })
      expect(result).not.toContain('<img')
      expect(result).toContain('&lt;img')
    })

    it('escapes quotes in attributes', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{
          type: 'text',
          text: 'link',
          marks: [{ type: 'link', attrs: { href: '" onclick="alert(1)' } }]
        }] }]
      })
      // The quote is escaped so onclick stays inside the href value, not a real attribute
      expect(result).toContain('&quot;')
      expect(result).toBe('<p><a href="&quot; onclick=&quot;alert(1)">link</a></p>')
    })

    it('blocks data:text/html URLs in links', () => {
      const result = renderTipTapToHtml({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{
          type: 'text',
          text: 'bad',
          marks: [{ type: 'link', attrs: { href: 'data:text/html,<script>alert(1)</script>' } }]
        }] }]
      })
      expect(result).toBe('<p>bad</p>')
    })
  })
})
