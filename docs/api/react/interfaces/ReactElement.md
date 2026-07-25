[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / ReactElement

# Interface: ReactElement\<P, T\>

Defined in: node\_modules/.pnpm/@types+react@19.2.17/node\_modules/@types/react/index.d.ts:325

Represents a JSX element.

Where [ReactNode](../type-aliases/ReactNode.md) represents everything that can be rendered, `ReactElement`
only represents JSX.

## Example

```tsx
const element: ReactElement = <div />;
```

## Type Parameters

### P

`P` = `unknown`

The type of the props object

### T

`T` *extends* `string` \| `JSXElementConstructor`\<`any`\> = `string` \| `JSXElementConstructor`\<`any`\>

The type of the component or tag

## Properties

### key

> **key**: `string` \| `null`

Defined in: node\_modules/.pnpm/@types+react@19.2.17/node\_modules/@types/react/index.d.ts:331

***

### props

> **props**: `P`

Defined in: node\_modules/.pnpm/@types+react@19.2.17/node\_modules/@types/react/index.d.ts:330

***

### type

> **type**: `T`

Defined in: node\_modules/.pnpm/@types+react@19.2.17/node\_modules/@types/react/index.d.ts:329
