function(doc) {
    if (doc.rd_schema_id=='rd/msg/conversation')
        emit(doc.rd_key, doc.conversation_id)
}
