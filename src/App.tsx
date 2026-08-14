import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type Product = {
  id: string
  name: string
  price: number
  description: string
  quantity: number
  createdAt: number
  updatedAt: number
}

const API = '/api/products'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? `Yêu cầu thất bại (${res.status})`)
  }
  return res.json() as Promise<T>
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(price: number): string {
  return price.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
  })
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editQuantity, setEditQuantity] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    request<Product[]>(API, { signal: controller.signal })
      .then((data) => {
        setError(null)
        setProducts(data)
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Không thể tải sản phẩm')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  function resetForm() {
    setName('')
    setPrice('')
    setDescription('')
    setQuantity('')
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const product = await request<Product>(API, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          price: Number(price) || 0,
          description,
          quantity: Number(quantity) || 0,
        }),
      })
      setProducts((prev) => [product, ...prev])
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo sản phẩm')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Xóa sản phẩm này?')) return
    setDeletingId(id)
    try {
      await request(API + '/' + id, { method: 'DELETE' })
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể xóa sản phẩm')
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setEditName(product.name)
    setEditPrice(String(product.price))
    setEditDescription(product.description)
    setEditQuantity(String(product.quantity))
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleUpdate() {
    if (!editingId || !editName.trim() || saving) return
    setSaving(true)
    try {
      const updated = await request<Product>(API + '/' + editingId, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          price: Number(editPrice) || 0,
          description: editDescription,
          quantity: Number(editQuantity) || 0,
        }),
      })
      setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)))
      cancelEdit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật sản phẩm')
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase()
    return q === ''
      ? true
      : p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  })

  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quản lý sản phẩm</h1>
        <p className="app-subtitle">
          {products.length} sản phẩm · Tổng giá trị {formatPrice(totalValue)}
        </p>
      </header>

      <form className="note-form" onSubmit={handleAdd}>
        <div className="note-form-row">
          <input
            className="note-input"
            type="text"
            placeholder="Tên sản phẩm..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="note-input"
            type="number"
            min="0"
            placeholder="Giá"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="note-input"
            type="number"
            min="0"
            placeholder="SL"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Đang lưu...' : 'Thêm'}
          </button>
        </div>
        <textarea
          className="note-textarea"
          placeholder="Mô tả (không bắt buộc)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </form>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Tìm kiếm sản phẩm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {products.length > 0 && (
          <span className="result-count">
            {filtered.length}/{products.length}
          </span>
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button className="btn btn-link" onClick={() => setError(null)}>
            Đóng
          </button>
        </div>
      )}

      <main className="notes-list">
        {loading && <p className="empty-state">Đang tải sản phẩm...</p>}

        {!loading && filtered.length === 0 && (
          <p className="empty-state">
            {query.trim() ? 'Không tìm thấy sản phẩm nào.' : 'Chưa có sản phẩm nào.'}
          </p>
        )}

        {!loading &&
          filtered.map((product) => {
            const isEditing = editingId === product.id
            return (
              <article className="note-card" key={product.id}>
                {isEditing ? (
                  <div className="note-editor">
                    <div className="note-form-row">
                      <input
                        className="note-input"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <input
                        className="note-input"
                        type="number"
                        min="0"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                      <input
                        className="note-input"
                        type="number"
                        min="0"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                      />
                    </div>
                    <textarea
                      className="note-textarea"
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                    <div className="note-actions">
                      <button
                        className="btn btn-primary"
                        onClick={handleUpdate}
                        disabled={saving || !editName.trim()}
                      >
                        {saving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button className="btn" onClick={cancelEdit}>
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="product-info">
                      <div className="note-body">
                        <h2 className="note-title">{product.name}</h2>
                        {product.description && (
                          <p className="note-content">{product.description}</p>
                        )}
                        <time className="note-date">
                          Cập nhật {formatDate(product.updatedAt)}
                        </time>
                      </div>
                      <div className="product-stats">
                        <span className="stat stat-price">{formatPrice(product.price)}</span>
                        <span className="stat">SL: {product.quantity}</span>
                        <span className="stat stat-total">
                          {formatPrice(product.price * product.quantity)}
                        </span>
                      </div>
                    </div>
                    <div className="note-actions">
                      <button className="btn" onClick={() => startEdit(product)}>
                        Sửa
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                      >
                        {deletingId === product.id ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </div>
                  </>
                )}
              </article>
            )
          })}
      </main>
    </div>
  )
}

export default App