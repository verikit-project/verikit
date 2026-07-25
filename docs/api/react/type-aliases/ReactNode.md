[**@verikit/react**](../react.md)

***

[@verikit/react](../react.md) / ReactNode

# Type Alias: ReactNode

> **ReactNode** = [`ReactElement`](../interfaces/ReactElement.md) \| `string` \| `number` \| `bigint` \| `Iterable`\<`ReactNode`\> \| `ReactPortal` \| `boolean` \| `null` \| `undefined` \| `DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES`\[keyof `DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES`\] \| `Promise`\<`AwaitedReactNode`\>

Defined in: node\_modules/.pnpm/@types+react@19.2.17/node\_modules/@types/react/index.d.ts:436

Represents all of the things React can render.

Where [ReactElement](../interfaces/ReactElement.md) only represents JSX, `ReactNode` represents everything that can be rendered.

## See

[React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/docs/reference/reactnode/)

## Examples

```tsx
// Typing children
type Props = { children: ReactNode }

const Component = ({ children }: Props) => <div>{children}</div>

<Component>hello</Component>
```

```tsx
// Typing a custom element
type Props = { customElement: ReactNode }

const Component = ({ customElement }: Props) => <div>{customElement}</div>

<Component customElement={<div>hello</div>} />
```
