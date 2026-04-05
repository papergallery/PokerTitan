import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="John Doe" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders single initial for single-word name', () => {
    render(<Avatar name="Alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders "?" when name is undefined and does not crash', () => {
    render(<Avatar />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders an img element when avatarUrl is provided', () => {
    render(<Avatar name="Bob" avatarUrl="https://example.com/avatar.png" />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  })
})
