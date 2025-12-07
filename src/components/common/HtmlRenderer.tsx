import DOMPurify from 'dompurify'

export function HtmlRenderer({ html, ...props }: React.ComponentProps<'div'> & { html: string }) {
  const safeHtml = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
  })
  // biome-ignore lint/security/noDangerouslySetInnerHtml: 就是要渲染 html 的，DOMPurify 保证纯净
  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} {...props} />
}
