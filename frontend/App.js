@app.route('/api/extractions', methods=['POST'])
def add_extraction():
    try:
        data = request.get_json()
        date = data.get('date')
        numbers = data.get('numbers')
        
        if not date or not numbers or len(numbers) != 6:
            return jsonify({'error': 'Data e 6 numeri richiesti'}), 400
        
        if any(n < 1 or n > 90 for n in numbers):
            return jsonify({'error': 'Numeri devono essere tra 1 e 90'}), 400
        
        if not db.conn:
            db.connect()
        
        db.cursor.execute('''
            INSERT INTO extractions (extraction_date, n1, n2, n3, n4, n5, n6)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (date, numbers[0], numbers[1], numbers[2], numbers[3], numbers[4], numbers[5]))
        
        db.conn.commit()
        
        # Aggiorna statistiche
        db.update_number_statistics()
        
        return jsonify({'success': True, 'message': 'Estrazione aggiunta con successo'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500