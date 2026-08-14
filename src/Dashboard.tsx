import { Card, Col, Empty, Row, Statistic } from 'antd'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Product } from './api'
import { formatPrice } from './format'

function Dashboard({ products }: { products: Product[] }) {
  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0)
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0)
  const avgPrice = products.length ? totalValue / products.length : 0

  const chartData = products.map((p) => ({
    name: p.name,
    'Giá trị': p.price * p.quantity,
    'Số lượng': p.quantity,
  }))

  return (
    <div className="dashboard">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Sản phẩm" value={products.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng giá trị kho"
              value={totalValue}
              formatter={(v) => formatPrice(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Tổng số lượng" value={totalQuantity} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Giá trị TB / sản phẩm"
              value={avgPrice}
              formatter={(v) => formatPrice(Number(v))}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Thống kê giá trị & số lượng theo sản phẩm" style={{ marginTop: 16 }}>
        {products.length === 0 ? (
          <Empty description="Chưa có dữ liệu để hiển thị biểu đồ" />
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis yAxisId="value" />
              <YAxis yAxisId="qty" orientation="right" />
              <Tooltip
                formatter={(value, name) =>
                  name === 'Giá trị' ? formatPrice(Number(value)) : `${value} sản phẩm`
                }
              />
              <Legend />
              <Bar
                yAxisId="value"
                dataKey="Giá trị"
                fill="#1677ff"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Line
                yAxisId="qty"
                type="monotone"
                dataKey="Số lượng"
                stroke="#52c41a"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}

export default Dashboard