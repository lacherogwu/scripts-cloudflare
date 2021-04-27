require('dotenv').config();
const axios = require('axios');

const wrapper = fn => (...args) => fn(...args).catch(e => console.log(e.response ? e.response.data : e.message));

const instance = axios.create({
	baseURL: 'https://api.cloudflare.com/client/v4',
	headers: {
		Authorization: `Bearer ${process.env[process.env.username]}`,
	},
});

const listZones = async (page = 1, zones = []) => {
	const params = new URLSearchParams({
		page,
		per_page: 50,
	});

	const { data } = await instance.get(`/zones?${params}`);
	zones = [...zones, ...data.result];

	return data.result.length === 50 ? listZones(++page, zones) : zones;
};

const listDnsRecords = async id => {
	const { data } = await instance.get(`/zones/${id}/dns_records`);
	return data.result;
};

const changeSecurityLevel = async (zoneId, level = 'medium') => {
	const list = ['off', 'essentially_off', 'low', 'medium', 'high', 'under_attack'];
	if (!list.includes(level)) throw new Error(`Level must be one of: ${list.join(', ')}`);

	const { data } = await instance.patch(`/zones/${zoneId}/settings/security_level`, {
		value: level,
	});
	console.log(data);
	return data;
};

wrapper(async () => {
	console.clear();

	const res = await listZones();
	const mapped = res.map(({ id, name }) => ({ id, name }));
	console.log(mapped);
	console.log(mapped.length);

	console.log(mapped[0]);
	await changeSecurityLevel(mapped[0].id, 'under_attack');
})();
