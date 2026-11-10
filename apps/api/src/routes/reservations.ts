import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { pool } from '../db/client.js';
import { requireAuth } from '../auth.js';

export const tableReservationsRouter = Router();

const createSchema = z.object({
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservationTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  guestCount: z.number().int().min(1).max(30),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(30),
  customerEmail: z.string().trim().email().max(255).optional().or(z.literal('')),
  seatingPreference: z.enum(['ANY', 'INDOOR', 'OUTDOOR', 'QUIET']).default('ANY'),
  specialRequests: z.string().max(1000).optional().default(''),
});

const statuses = ['REQUESTED', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'DECLINED'] as const;

tableReservationsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check the reservation details.', details: parsed.error.flatten() });
    const value = parsed.data;
    const date = new Date(`${value.reservationDate}T00:00:00`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.reservationDate) {
      return res.status(400).json({ error: 'Please select a valid reservation date.' });
    }
    const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const datePart = (type: string) => dateParts.find(part => part.type === type)?.value ?? '';
    const localToday = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
    if (value.reservationDate < localToday) return res.status(400).json({ error: 'Reservation date cannot be in the past.' });

    const reservationNumber = `SR-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const result = await pool.query(
      `INSERT INTO table_reservations
        (reservation_number, reservation_date, reservation_time, guest_count, customer_name, customer_phone, customer_email, seating_preference, special_requests, reservation_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'REQUESTED')
       RETURNING id,reservation_number,reservation_date,reservation_time,guest_count,customer_name,reservation_status,created_at`,
      [reservationNumber, value.reservationDate, value.reservationTime, value.guestCount, value.customerName, value.customerPhone, value.customerEmail || null, value.seatingPreference, value.specialRequests || null],
    );
    res.status(201).json({ reservation: result.rows[0], message: 'Reservation request received. The cafe team will contact the guest to confirm availability.' });
  } catch (error) { next(error); }
});

tableReservationsRouter.get('/', requireAuth('OWNER', 'MANAGER', 'CASHIER', 'SERVICE'), async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id,reservation_number,reservation_date,reservation_time,guest_count,customer_name,customer_phone,customer_email,seating_preference,special_requests,reservation_status,created_at,updated_at
       FROM table_reservations ORDER BY reservation_date DESC,reservation_time DESC,created_at DESC LIMIT 250`,
    );
    res.json({ reservations: result.rows });
  } catch (error) { next(error); }
});

tableReservationsRouter.patch('/:id/status', requireAuth('OWNER', 'MANAGER', 'CASHIER', 'SERVICE'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = z.object({ status: z.enum(statuses) }).safeParse(req.body);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid reservation ID.' });
    if (!parsed.success) return res.status(400).json({ error: 'Invalid reservation status.' });
    const result = await pool.query(
      `UPDATE table_reservations SET reservation_status=$1,updated_at=now() WHERE id=$2
       RETURNING id,reservation_number,reservation_date,reservation_time,guest_count,customer_name,reservation_status,updated_at`,
      [parsed.data.status, id],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Reservation not found.' });
    res.json({ reservation: result.rows[0] });
  } catch (error) { next(error); }
});
