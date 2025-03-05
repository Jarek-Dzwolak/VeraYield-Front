import React, { useState } from "react";
import "./OrderForm.css";

const OrderForm = () => {
  const [orderType, setOrderType] = useState("buy");
  const [price, setPrice] = useState("48,720.12");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);

    // Przelicz total
    if (value && price) {
      const numericPrice = parseFloat(price.replace(/,/g, ""));
      const numericAmount = parseFloat(value);
      const calculatedTotal = (numericPrice * numericAmount).toFixed(2);
      setTotal(calculatedTotal);
    } else {
      setTotal("");
    }
  };

  return (
    <div className="order-form card">
      <h3>Place Order</h3>
      <div className="form-group">
        <label>Type</label>
        <div className="button-group">
          <button
            className={orderType === "buy" ? "active" : ""}
            onClick={() => setOrderType("buy")}
          >
            Buy
          </button>
          <button
            className={orderType === "sell" ? "active" : ""}
            onClick={() => setOrderType("sell")}
          >
            Sell
          </button>
        </div>
      </div>
      <div className="form-group">
        <label>Price (USDT)</label>
        <input
          type="text"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Amount (BTC)</label>
        <input
          type="text"
          placeholder="0.00"
          value={amount}
          onChange={handleAmountChange}
        />
      </div>
      <div className="form-group">
        <label>Total (USDT)</label>
        <input type="text" placeholder="0.00" value={total} readOnly />
      </div>
      <button className={`order-button ${orderType}`}>
        {orderType === "buy" ? "Buy BTC" : "Sell BTC"}
      </button>
    </div>
  );
};

export default OrderForm;
