module.exports = async (req, res) => {
    res.setHeader('Set-Cookie', `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`);
    res.status(200).json({ ok: true });
};