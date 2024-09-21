import { isValidPlaylistDescription, isValidPlaylistName } from "../playlist"

describe("Validatior: playlist name", () => {
    it("should return false when name is not provided", () => {
        const isValidNull = isValidPlaylistName(null)
        const isValidEmpty = isValidPlaylistName("")
        expect(isValidNull).toBe(false)
        expect(isValidEmpty).toBe(false)
    })
    it("should return false when name is too short or too long", () => {
        const shortString = "a"
        const shortWithSpacesString = " a   "
        const longString = "abcdefghijabcdefghijabcde" // 25
        expect(isValidPlaylistName(shortString)).toBe(false)
        expect(isValidPlaylistName(shortWithSpacesString)).toBe(false)
        expect(isValidPlaylistName(longString)).toBe(false)
    })
    it("should return false when not matching regex", () => {
        expect(isValidPlaylistName("foo.")).toBe(false)
        expect(isValidPlaylistName("foo_")).toBe(false)
        expect(isValidPlaylistName("љшђfoo")).toBe(false)
        expect(isValidPlaylistName("😀😡")).toBe(false)
        expect(isValidPlaylistName("f 😡")).toBe(false)
        expect(isValidPlaylistName("љшђf😀😡")).toBe(false)
    })
    it("should return true when using letters and emojis", () => {
        expect(isValidPlaylistName("foo")).toBe(true)
        expect(isValidPlaylistName("foo bar")).toBe(true)
        expect(isValidPlaylistName("fo😡")).toBe(true)
        expect(isValidPlaylistName("foo 😀😀😡")).toBe(true)
    })
})

describe("Validator: playlist description", () => {
    it("should return false when valiue is above 100 chars", () => {
        let longString = "abcdefghij"
        for(let i = 0; i < 4; i++){ // 10+10+20+40+80
            longString += longString
        }
        expect(isValidPlaylistDescription(longString)).toBe(false)
    })
    it("should return true on empty string or in under 100 chars", () => {
        expect(isValidPlaylistDescription(null)).toBe(true)
        expect(isValidPlaylistDescription("")).toBe(true)
        expect(isValidPlaylistDescription("foo bar")).toBe(true)
    })
})