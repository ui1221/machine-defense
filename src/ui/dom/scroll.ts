export function enableDragScroll(el: HTMLElement) {
  let dragging = false
  let lastY = 0
  let moved = 0
  let pointerId: number | null = null
  let downButton: HTMLButtonElement | null = null

  el.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    dragging = true
    lastY = event.clientY
    moved = 0
    pointerId = event.pointerId
    downButton = event.target instanceof Element
      ? event.target.closest('button')
      : null
    el.setPointerCapture(event.pointerId)
    el.classList.add('is-dragging')
    event.preventDefault()
  })

  el.addEventListener('pointermove', event => {
    if (!dragging || pointerId !== event.pointerId) return
    const delta = lastY - event.clientY
    moved += Math.abs(delta)
    lastY = event.clientY
    el.scrollTop += delta
  })

  const stop = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return
    if (moved < 8 && downButton && el.contains(downButton) && !downButton.disabled) {
      downButton.click()
    }
    dragging = false
    pointerId = null
    downButton = null
    el.classList.remove('is-dragging')
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
  }

  el.addEventListener('pointerup', stop)
  el.addEventListener('pointercancel', stop)
  el.addEventListener('lostpointercapture', () => {
    dragging = false
    pointerId = null
    downButton = null
    el.classList.remove('is-dragging')
  })
}
