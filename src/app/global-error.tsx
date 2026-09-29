'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, RefreshCw } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log sanitized error message for diagnostics without leaking credentials or stack
    console.error('[Critical Application Error caught by global-error]:', error.message)
  }, [error])

  return (
    <html lang="en">
      <head>
        <title>Application Error | Aurelia</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: '1rem',
          minHeight: '100dvh',
          backgroundColor: '#161311',
          color: '#f6f4f1',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
            padding: '2rem 1.5rem',
            backgroundColor: '#1f1a17',
            borderRadius: '1rem',
            border: '1px solid #332b26',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Warning Icon Badge */}
          <div
            style={{
              width: '4.5rem',
              height: '4.5rem',
              borderRadius: '1rem',
              backgroundColor: 'rgba(217, 75, 42, 0.12)',
              border: '1px solid rgba(217, 75, 42, 0.25)',
              color: '#e05838',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <AlertCircle style={{ width: '2.25rem', height: '2.25rem' }} />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <p
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#e05838',
                margin: '0 0 0.5rem',
              }}
            >
              Application Error
            </p>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                lineHeight: 1.25,
                margin: '0 0 0.75rem',
                color: '#f6f4f1',
                fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
              }}
            >
              A mishap in the kitchen
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: '#a89f91',
                margin: 0,
              }}
            >
              Aurelia encountered an unexpected issue while rendering the application shell.
              Your recipes, meal plans, and culinary notes remain safely stored.
            </p>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '44px',
                padding: '0 1.25rem',
                backgroundColor: '#b85d36',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <RotateCcw style={{ width: '1rem', height: '1rem' }} />
              <span>Try Again</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '44px',
                padding: '0 1.25rem',
                backgroundColor: '#29221e',
                color: '#f6f4f1',
                border: '1px solid #3d332c',
                borderRadius: '0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
