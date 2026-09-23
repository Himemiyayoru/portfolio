import type { MDXComponents } from "mdx/types";
import type { AnchorHTMLAttributes } from "react";

function Anchor(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = props.href?.startsWith("http");
  return (
    <a
      {...props}
      target={external ? "_blank" : props.target}
      rel={external ? "noreferrer" : props.rel}
    />
  );
}

export function useMDXComponents(): MDXComponents {
  return {
    a: Anchor,
  };
}
