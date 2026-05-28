import { portraitStandee } from './standee'
import type { DomScreen } from './mount'

export interface LobbyStandeeScreenHandle extends DomScreen {
  setMessage: (message: string) => void
  hideMessage: () => void
}

export interface LobbyStandeeScreenOptions {
  returning: boolean
  onTap: () => void
}

export function mountLobbyStandeeScreen(root: HTMLElement, opts: LobbyStandeeScreenOptions): LobbyStandeeScreenHandle {
  const screen = document.createElement('div')
  screen.className = 'md-ui-screen md-lobby-standee-screen'

  const message = document.createElement('div')
  message.className = 'md-lobby-message'
  const body = document.createElement('p')
  body.className = 'md-lobby-message__body'
  message.append(body)

  const standee = portraitStandee({
    className: opts.returning ? 'md-lobby-standee is-returning' : 'md-lobby-standee',
    shadowColor: '#ffee00',
    shadowAlpha: 0.42,
    onClick: opts.onTap,
  })
  screen.append(message, standee)
  root.append(screen)

  return {
    setMessage: nextMessage => {
      body.textContent = nextMessage
      message.classList.add('is-visible')
    },
    hideMessage: () => {
      message.classList.remove('is-visible')
    },
    destroy: () => screen.remove(),
  }
}
