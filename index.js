const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const credentials_ck = "ck_805aa422ac6ff77ff28160eff9ec54ac63199bff";
const credentials_cs = "cs_76a31e8260f03595f3800dfa1c80249a477a6c3b";

const updateOrder = async (orderId, updatedOrder) => {
    try {
        const encodedCredentials = Buffer.from(`${credentials_ck}:${credentials_cs}`).toString('base64');
        await axios.post(`https://katyayaniorganics.com/wp-json/wc/v1/orders/${orderId}`, updatedOrder, {
            headers: {
                'Authorization': `Basic ${encodedCredentials}`
            }
        });
    } catch (error) {
        console.error("Error updating order:", error);
    }
};

app.post('/woocommerce/update-shipping', async (req, res) => {
    const shippingData = req.body;
    console.log(shippingData);
    console.log(shippingData.billing.first_name);
    
    const billing = shippingData.billing;
    try {
        if (!shippingData.shipping) {
            const data = {
                shipping: {
                    "first_name": shippingData.billing.first_name,
                    "last_name": shippingData.billing.last_name,
                    "company": shippingData.billing.company,
                    "address_1": shippingData.billing.address_1,
                    "address_2": shippingData.billing.address_2,
                    "city": shippingData.billing.city,
                    "state": shippingData.billing.state.name,
                    "postcode": shippingData.billing.postcode,
                    "country": shippingData.billing.country,
                    "email": shippingData.billing.email,
                    "phone": shippingData.billing.phone
                }
            };
            await updateOrder(shippingData.id, data);
        }
        res.status(200).send("Shipping addresses updated successfully");
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal server error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});