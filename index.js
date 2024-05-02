const express = require('express');

const app = express();
app.use(express.json());

const axios = require('axios');

const credentials_ck = "ck_805aa422ac6ff77ff28160eff9ec54ac63199bff";
const credentials_cs = "cs_76a31e8260f03595f3800dfa1c80249a477a6c3b";
const getOrders = async () => {
    try {
        const encodedCredentials = Buffer.from(`${credentials_ck}:${credentials_cs}`).toString('base64');
        const response = await axios.get('https://katyayaniorganics.com/wp-json/wc/v1/orders', {
            headers: {
                'Authorization': `Basic ${encodedCredentials}`
            }
        });
        const ordersResponse = response.data;
        return ordersResponse;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
};

// const data = {
//     shipping: {
//         first_name, last_name, company, address_1, address_2, city, state, postcode, country, email, phone
//     }
// }
const updateOrder = async (orderId, updatedOrder) => {
    try {
        const encodedCredentials = Buffer.from(`${credentials_ck}:${credentials_cs}`).toString('base64');
        await axios.post(`https://katyayaniorganics.com/wp-json/wc/v1/orders/${orderId}`, updatedOrder, {
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'body': data
            }
        });
    } catch (error) {
        console.error("Error updating order:", error);
    }
};

app.post('/update-shipping', async (req, res) => {
    const shippingData = req.body;
    console.log(shippingData);
    // try {
    //     const ordersResponse = await getOrders();

    //     if (!ordersResponse) {
    //         res.status(500).send("Failed to fetch orders");
    //         return;
    //     }

    //     for (const order of ordersResponse) {
    //         if (!order.shipping) {
    //             order.shipping = order.billing;

    //             await updateOrder(order.id, order);
    //         }
    //     }

    //     res.status(200).send("Shipping addresses updated successfully");
    // } catch (error) {
    //     console.error("Error:", error);
    //     res.status(500).send("Internal server error");
    // }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

