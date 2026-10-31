declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '@/styles/*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
