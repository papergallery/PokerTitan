import { render, screen } from '@testing-library/react'
import { MMRBadge } from './MMRBadge'

describe('MMRBadge', () => {
  it('renders the MMR value', () => {
    render(<MMRBadge mmr={1200} />)
    expect(screen.getByText('1200')).toBeInTheDocument()
  })

  it('renders the lightning emoji', () => {
    render(<MMRBadge mmr={1200} />)
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  it('applies yellow color class for MMR > 1500', () => {
    const { container } = render(<MMRBadge mmr={1600} />)
    expect(container.firstChild).toHaveClass('text-yellow-400')
  })

  it('applies accent color class for MMR between 1000 and 1500', () => {
    const { container } = render(<MMRBadge mmr={1200} />)
    expect(container.firstChild).toHaveClass('text-accent')
  })

  it('applies muted color class for MMR below 1000', () => {
    const { container } = render(<MMRBadge mmr={800} />)
    expect(container.firstChild).toHaveClass('text-muted')
  })

  it('renders with sm size', () => {
    const { container } = render(<MMRBadge mmr={1200} size="sm" />)
    expect(container.firstChild).toHaveClass('text-sm')
  })
})
