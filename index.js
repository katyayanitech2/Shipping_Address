const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
require("dotenv").config();
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
    if (shippingData == { webhook_id: '16' }) {
        console.log("Unused webhook request");
    } else {
        console.log(shippingData);
        console.log("Billing data", shippingData.billing.first_name);
        console.log("Shipping data", shippingData.shipping.first_name);

        try {
            if (shippingData.shipping.first_name == '') {
                const data = {
                    shipping: {
                        "first_name": shippingData.billing.first_name,
                        "last_name": shippingData.billing.last_name,
                        "company": shippingData.billing.company,
                        "address_1": shippingData.billing.address_1,
                        "address_2": shippingData.billing.address_2,
                        "city": shippingData.billing.city,
                        "state": shippingData.billing.state,
                        "postcode": shippingData.billing.postcode,
                        "country": shippingData.billing.country,
                        "email": shippingData.billing.email,
                        "phone": shippingData.billing.phone
                    }
                };
                console.log("Shipping data demo : ", data);
                await updateOrder(shippingData.id, data);
            }
            res.status(200).send("Shipping addresses updated successfully");

        } catch (error) {
            console.error("Error:", error);
            res.status(500).send("Internal server error");
        }
    }
});

async function fetchAccessToken() {
    const accessTokenUrl = process.env.ACCESS_TOKEN_URL;

    try {
        const response = await axios.get(accessTokenUrl);
        return response.data.trim();
    } catch (error) {
        console.error("Error fetching access token:", error.message);
        throw error;
    }
}

async function getInactiveContacts() {
    try {
        const token = await fetchAccessToken();
        console.log("Access Token is:", token);

        const config = {
            headers: {
                'Authorization': `Zoho-oauthtoken ${token}`
            }
        };

        const response = await axios.get('https://www.zohoapis.in/crm/v2/Contacts/search?criteria=(Customer_Status:equals:Inactive)', config);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching inactive contacts:', error.message);
        throw error;
    }
}

async function kylasTaskCreate(ownerId, contactId) {
    const apiKey = '1e8d51e4-de78-4394-b5a9-e9d10b1e72d2';
    const apiUrl = 'https://api.kylas.io/v1/tasks/';

    try {
        const currentTime = new Date();
        const currentTimeIST = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

        const dueDateIST = new Date(currentTimeIST.getTime() + (1 * 60 * 60 * 1000));

        const formattedDueDate = dueDateIST.toISOString().slice(0, 19);

        console.log("Due Date (IST):", formattedDueDate);
        const postData = {
            type: 76113,
            status: 76117,
            reminder: "ONE_HOUR",
            assignedTo: ownerId,
            dueDate: formattedDueDate.toString(),
            name: "Followup in 1 Hour (touchdown)",
            Priority: "Medium",
            relation: [
                {
                    createdBy: 15857,
                    updatedBy: 15857,
                    deleted: false,
                    version: 0,
                    tenantId: 3082,
                    targetEntityType: "LEAD",
                    targetEntityId: 15769866,
                    id: contactId
                }
            ]
        };
        const response = await axios.post(apiUrl, postData, {
            headers: {
                'api-key': apiKey
            }
        });

        console.log("Task created successfully: by ownerId", ownerId);
    } catch (error) {
        console.error("Error creating task:", error.message);
    }
}

async function sendLeadSearchRequests(phoneNumbers) {
    const apiKey = '1e8d51e4-de78-4394-b5a9-e9d10b1e72d2';
    const apiUrl = 'https://api.kylas.io/v1/search/lead';

    for (let i = 0; i < phoneNumbers.length; i++) {
        try {
            const response = await axios.post(apiUrl, {
                fields: [
                    "firstName",
                    "lastName",
                    "ownerId",
                    "state",
                    "pipelineStage",
                    "phoneNumbers",
                    "pipelineStageReason",
                    "createdAt",
                    "updatedAt",
                    "utmSource",
                    "utmCampaign",
                    "utmMedium",
                    "utmContent",
                    "utmTerm",
                    "id",
                    "recordActions",
                    "customFieldValues"
                ],
                jsonRule: {
                    rules: [
                        {
                            id: "multi_field",
                            field: "multi_field",
                            type: "multi_field",
                            input: "multi_field",
                            operator: "multi_field",
                            value: phoneNumbers[i]
                        }
                    ],
                    condition: "AND",
                    valid: true
                }
            }, {
                headers: {
                    'api-key': apiKey
                }
            });

            if (response.data.content.length === 0) {
                console.log("No content for phone number:", phoneNumbers[i]);
                continue;
            }

            const ownerId = response.data.content[0].ownerId;
            const contactId = response.data.content[0].phoneNumbers[0].id;
            console.log("Owner ID:", ownerId);
            console.log("Contact ID:", contactId);

            await kylasTaskCreate(ownerId, contactId);

        } catch (error) {
            console.log("Error occurred while fetching data:");
        }
    }
}

async function startServer() {
    try {
        const inactiveContacts = await getInactiveContacts();
        const phoneNumbers = inactiveContacts.map(contact => contact.Phone);
        console.log("Contact count:", phoneNumbers.length);
        console.log("Phone numbers:", phoneNumbers);

        if (phoneNumbers.length === 0) {
            console.log("No inactive contacts found.");
            return;
        }

        await sendLeadSearchRequests(phoneNumbers);
        console.log("Success");
    } catch (error) {
        console.error('Error starting server:', error.message);
    }
}

cron.schedule('0 11 * * *', async () => {
    console.log('Running the task...');
    await startServer();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});