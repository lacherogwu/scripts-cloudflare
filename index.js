require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const zonesData = require('./data.json');

const instance = axios.create({
	baseURL: 'https://api.cloudflare.com/client/v4',
	headers: {
		Authorization: `Bearer ${process.env.API_KEY}`,
	},
});

const listZones = async (page = 1) => {
	const params = new URLSearchParams({
		page,
		per_page: 50,
	});

	const { data } = await instance.get(`/zones?${params}`);

	return data.result;
};

const getAllDomains = async (page = 1) => {
	const list = [];

	let data;
	while (!data || data.length === 50) {
		data = await listZones(page);
		list.push(...data);
		page++;
	}

	const filtered = list.filter(item => item.status === 'active');
	const mapped = filtered.map(item => ({
		id: item.id,
		domain: item.name,
	}));
	console.log('Received all domains');
	return mapped;
};

const listDnsRecods = async id => {
	const { data } = await instance.get(`/zones/${id}/dns_records`);
	return data.result;
};

const mapDnsRecords = async zones => {
	const dnsRecords = {};

	for (zone of zones) {
		console.log(`Getting records for ${zone.domain}`);
		const records = await listDnsRecods(zone.id);
		dnsRecords[zone.domain] = records;
	}

	// map records to domain
	return zones.map(i => ({ ...i, records: dnsRecords[i.domain] }));
};

const getOldPleskDomains = async () => {
	let zones = await getAllDomains();

	// retrieve records
	zones = await mapDnsRecords(zones);

	// filter domains
	const filtered = zones.filter(item =>
		item.records.some(r => r.type === 'A' && r.content === '18.221.148.66')
	);

	fs.writeFileSync('data.json', JSON.stringify(filtered));
};

const updateDnsRecord = async (domain, zoneId, id) => {
	try {
		await instance.put(`/zones/${zoneId}/dns_records/${id}`, {
			type: 'A',
			name: domain,
			content: '1.2.3.4',
			ttl: 1,
			proxied: true,
		});
		console.log(`${domain} updated successfully!`);
	} catch (err) {
		console.log(err);
		console.log(`${domain} has an error!`);
	}
};

(async () => {
	for (zone of zonesData) {
		const record = zone.records.find(
			i => i.type === 'A' && i.content === '18.221.148.66'
		);
		await updateDnsRecord(zone.domain, zone.id, record.id);
	}
})();
