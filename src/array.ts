import { random } from './random'

export const shuffle = <T>(array: T[], seed: number): void => {
    for (let i = array.length - 1; i > 0; i--) {
        const seed2 = ((3333 * i + 2727 + seed) % 1000) / 1000
        const j = Math.floor(random(seed2) * (i + 1))
        const temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
}
