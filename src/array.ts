import { random } from './random'

export const shuffled = <T>(array: T[], seed: number): T[] => {
    const copy = [...array]
    let shuffleSeed = random(seed)
    const s = []
    while (copy.length > 0) {
        shuffleSeed = random(shuffleSeed)
        s.push(copy.splice(Math.floor(copy.length * shuffleSeed), 1)[0])
    }
    return s
}
