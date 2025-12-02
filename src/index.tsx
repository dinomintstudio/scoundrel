/* @refresh reload */
import { Accessor, Component, For, JSX, Match, Switch, createSignal, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { shuffle } from './array'
import './index.css'
import rules from './assets/rules.txt'

type State = 'started' | 'lost' | 'won'

type Card = {
    type: 'monster' | 'weapon' | 'potion'
    value: number
}

const createDeck = (): Card[] => {
    const deck: Card[] = []
    for (let value = 2; value <= 14; value++) {
        deck.push({ type: 'monster', value })
        deck.push({ type: 'monster', value })
    }
    for (let value = 2; value <= 10; value++) {
        deck.push({ type: 'weapon', value })
        deck.push({ type: 'potion', value })
    }
    return deck
}

type ActiveWeapon = {
    card: Card
    monsters: Card[]
}

type CardProps = {
    card?: Card
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>
const CardComponent: Component<CardProps> = (props: CardProps) => {
    return (
        <Switch>
            <Match when={props.card}>
                <button type="button" class="card" {...props} classList={{ [props.card!.type]: true }}>
                    <span class="value">{props.card!.value}</span>
                    <span>{props.card!.type}</span>
                </button>
            </Match>
            <Match when={true}>
                <button type="button" disabled class="card empty" title={props.title} />
            </Match>
        </Switch>
    )
}

type PileProps = {
    pile: Accessor<Card[]>
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>
const Pile: Component<PileProps> = (props: PileProps) => {
    return (
        <button type="button" class="pile" {...props} classList={{ empty: props.pile().length === 0 }}>
            <span>{props.pile().length}</span>
        </button>
    )
}

const Main: Component = () => {
    const [state, setState] = createSignal<State>('started')
    const [seed, setSeed] = createSignal(0)
    const [draw, setDraw] = createSignal<Card[]>([])
    const [discard, setDiscard] = createSignal<Card[]>([])
    const [room, setRoom] = createSignal<(Card | undefined)[]>([undefined, undefined, undefined, undefined])
    const [health, setHealth] = createSignal(20)
    const [lastRoomAvoided, setLastRoomAvoided] = createSignal(false)
    const [activeWeapon, setActiveWeapon] = createSignal<ActiveWeapon | undefined>()
    onMount(() => {
        setSeed(Math.floor(Math.random() * 100_000))
        startGame()
    })
    const startGame = () => {
        const deck = createDeck()
        shuffle(deck, seed())
        setDraw(deck)

        setDiscard([])
        setRoom([])
        setHealth(20)
        setLastRoomAvoided(false)
        setActiveWeapon(undefined)

        setState('started')
        startTurn()
    }
    const startTurn = () => {
        for (let i = 0; i < 4; i++) {
            if (draw().length === 0) return

            if (!room()[i]) {
                const room_ = [...room()]
                const pop = draw()[0]
                room_[i] = pop
                setRoom(room_)
                setDraw([...draw().slice(1)])
            }
        }
    }
    const avoidRoom = () => {
        if (state() !== 'started') return
        if (room().some(c => !c)) {
            alert('finish room first')
            return
        }
        if (room().find(c => !c) || lastRoomAvoided()) {
            alert('previous room was avoided')
            return
        }
        setDraw([...draw(), ...(room() as Card[])])
        setRoom([undefined, undefined, undefined, undefined])
        setLastRoomAvoided(true)
        startTurn()
    }
    const playCard = (i: number, alternative: boolean) => {
        if (state() !== 'started') return
        let card = room()[i]
        if (!card) return

        switch (card.type) {
            case 'monster': {
                if (alternative) {
                    // barehanded
                    setHealth(health() - card.value)
                } else {
                    // with weapon
                    const activeWeapon_ = activeWeapon()
                    if (activeWeapon_) {
                        const limit = activeWeapon_.monsters.at(-1)?.value ?? Number.POSITIVE_INFINITY
                        if (card.value < limit) {
                            const dmg = Math.max(0, card.value - activeWeapon_.card.value)
                            setHealth(health() - dmg)
                            activeWeapon_.monsters.push(card)
                            setActiveWeapon({ ...activeWeapon_ })

                            const room_ = [...room()]
                            room_[i] = undefined
                            setRoom(room_)
                            card = undefined
                        } else {
                            alert('last slain monster was too weak')
                            return
                        }
                    } else {
                        alert('no weapon equipped')
                        return
                    }
                }
                break
            }
            case 'weapon': {
                const activeWeapon_ = activeWeapon()
                if (activeWeapon_) {
                    setDiscard([...discard(), activeWeapon_.card, ...activeWeapon_.monsters])
                    setActiveWeapon(undefined)
                }
                setActiveWeapon({ card, monsters: [] })
                break
            }
            case 'potion': {
                let health_ = health() + card.value
                // if this potion is the last remaining card, don't limit it to be counted to score
                if ([...draw(), ...room()].filter(c => c).length !== 1) {
                    health_ = Math.min(20, health_)
                }
                setHealth(health_)
                break
            }
        }

        if (health() <= 0) {
            setState('lost')
            return
        }
        if (card) {
            const room_ = [...room()]
            room_[i] = undefined
            setRoom(room_)
            setDiscard([...discard(), card])
        }
        if (room().filter(c => c).length === 0 && draw().length === 0) {
            setState('won')
            return
        }
        if (room().filter(c => c).length === 1) {
            setLastRoomAvoided(false)
            startTurn()
        }
    }
    const score = (): { won?: number; lost?: number } => {
        const health_ = health()
        const draw_ = draw()
        const room_ = room()
        const won = health_
        const lost =
            health_ -
            [...draw_, ...room_]
                .filter(c => c?.type === 'monster')
                .map(c => c!.value)
                .reduce((a, b) => a + b, 0)
        switch (state()) {
            case 'started':
                return { won, lost }
            case 'lost':
                return { lost }
            case 'won':
                return { won }
        }
    }
    return (
        <div class="game">
            <header>
                <span class="title">Scoundrel</span>
                <span>Online version of a single player rogue-like card game</span>
            </header>
            <div class="piles">
                <Pile pile={draw} onClick={avoidRoom} title="draw pile" />
                <Pile pile={discard} disabled title="discard pile" />
            </div>
            <div class="room">
                <For each={room()}>
                    {(roomCard, i) => <CardComponent card={roomCard} onClick={e => playCard(i(), e.shiftKey)} />}
                </For>
            </div>
            <div class="tools">
                <div class="equipped">
                    <CardComponent card={activeWeapon()?.card} title="equipped weapon" />
                    <div class="slain">
                        <For each={activeWeapon()?.monsters}>
                            {(monster, i) => <CardComponent card={monster} style={{ left: `${i() * 2}rem` }} />}
                        </For>
                    </div>
                </div>
                <div class="stats">
                    <table>
                        <tbody>
                            <Switch>
                                <Match when={state() === 'won'}>victory!</Match>
                                <Match when={state() === 'lost'}>game over!</Match>
                                <Match when={true}>&nbsp</Match>
                            </Switch>
                            <tr>
                                <td>health:</td>
                                <td classList={{ low: health() <= 5 }}>{health()}</td>
                            </tr>
                            <tr>
                                <td>score:</td>
                                <Switch>
                                    <Match when={state() === 'started'}>
                                        <td class="score">
                                            {score().lost}/{score().won}
                                        </td>
                                    </Match>
                                    <Match when={true}>
                                        <td class="score" title="won/lost score">
                                            {state() === 'won' ? score().won : score().lost}
                                        </td>
                                    </Match>
                                </Switch>
                            </tr>
                            <tr>
                                <td>seed:</td>
                                <td>{seed()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <footer>
                <div class="controls">
                    <span>keyboard controls:</span>
                    <span>
                        <pre>R</pre> restart
                    </span>
                    <span>
                        <pre>A</pre> avoid room
                    </span>
                    <span>
                        <pre>1</pre>/<pre>2</pre>/<pre>3</pre>/<pre>4</pre> play card
                    </span>
                    <span>
                        <pre>H</pre>/<pre>J</pre>/<pre>K</pre>/<pre>L</pre> play card
                    </span>
                    <span>
                        play+<pre>Shift</pre> barehand
                    </span>
                </div>
                <div class="credits">
                    <span>
                        design by <a href="http://stfj.net/">Zach Gage</a> and{' '}
                        <a href="https://www.kurtiswow.com/">Kurt Bieg</a>
                    </span>
                    <span>
                        implementation by <a href="http://substepgames.com/">Substep Games</a>
                    </span>
                    <span>
                        <a href={rules}>rules</a> (<a href="http://stfj.net/art/2011/Scoundrel.pdf">original</a>,{' '}
                        <a href="https://youtu.be/Gt2tYzM93h4">video</a>)
                    </span>
                </div>
            </footer>
        </div>
    )
}

render(() => <Main />, document.getElementById('root')!)
