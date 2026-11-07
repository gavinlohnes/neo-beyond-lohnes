import { expect, it } from "vitest";
import { linkFirstMention } from "../src/application/connectionQueries";

it("UNLINKED-001: never links a name that sits inside another [[link]]", () => {
  expect(linkFirstMention("[[Ann and Bob plan]]", "Bob")).toBeNull();
  expect(linkFirstMention("[[Ann and Bob plan]] then Bob called", "Bob")).toBe("[[Ann and Bob plan]] then [[Bob]] called");
  expect(linkFirstMention("Bob and [[Bob]]", "Bob")).toBe("[[Bob]] and [[Bob]]");
  expect(linkFirstMention("Bobby came", "Bob")).toBeNull();
});
